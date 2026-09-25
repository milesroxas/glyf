//! PICOBOOT client for the RP2040 USB bootloader, the vendor interface that
//! `picotool` talks to. Framing follows pico-sdk `boot/picoboot.h` and
//! picotool's `picoboot_connection.c`.

use rusb::{Device, DeviceHandle, Direction, GlobalContext, Recipient, RequestType, TransferType};
use std::time::Duration;

use super::uf2::{FlashImage, FLASH_START, SECTOR_SIZE};

pub const BOOTROM_VID: u16 = 0x2E8A;
pub const BOOTROM_PID: u16 = 0x0003;

const MAGIC: u32 = 0x431F_D10B;
const IF_RESET: u8 = 0x41;
const IF_CMD_STATUS: u8 = 0x42;

const PC_EXCLUSIVE_ACCESS: u8 = 0x01;
const PC_REBOOT: u8 = 0x02;
const PC_FLASH_ERASE: u8 = 0x03;
const PC_READ: u8 = 0x84;
const PC_WRITE: u8 = 0x05;
const PC_EXIT_XIP: u8 = 0x06;
/// Command ids with the top bit set have an IN data stage.
const CMD_DIR_IN: u8 = 0x80;

/// Lock out the mass-storage drive while we rewrite flash (picotool's mode).
const EXCLUSIVE: u8 = 1;
/// Stack pointer for PC_REBOOT (end of RP2040 SRAM), as picotool passes.
const SRAM_END: u32 = 0x2004_2000;
const REBOOT_DELAY_MS: u32 = 500;

const COMMAND_TIMEOUT: Duration = Duration::from_secs(3);
const TRANSFER_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Copy)]
pub enum FlashPhase {
    Writing,
    Verifying,
}

enum Data<'a> {
    None,
    Out(&'a [u8]),
    In(&'a mut [u8]),
}

fn bootloader_devices() -> Vec<Device<GlobalContext>> {
    let Ok(devices) = rusb::devices() else {
        return Vec::new();
    };
    devices
        .iter()
        .filter(|d| {
            d.device_descriptor()
                .map(|desc| desc.vendor_id() == BOOTROM_VID && desc.product_id() == BOOTROM_PID)
                .unwrap_or(false)
        })
        .collect()
}

/// Number of RP2040 boards sitting in their USB bootloader.
pub fn bootloader_count() -> usize {
    bootloader_devices().len()
}

/// True when an RP2040 is sitting in its USB bootloader.
pub fn is_present() -> bool {
    bootloader_count() > 0
}

pub const MULTIPLE_BOOTLOADERS: &str =
    "More than one RP2040 board is in bootloader mode. Disconnect the others, then try again.";

fn encode_command(token: u32, id: u8, args: &[u8], transfer_len: u32) -> [u8; 32] {
    let mut cmd = [0u8; 32];
    cmd[0..4].copy_from_slice(&MAGIC.to_le_bytes());
    cmd[4..8].copy_from_slice(&token.to_le_bytes());
    cmd[8] = id;
    cmd[9] = args.len() as u8;
    cmd[12..16].copy_from_slice(&transfer_len.to_le_bytes());
    cmd[16..16 + args.len()].copy_from_slice(args);
    cmd
}

fn range_args(addr: u32, size: u32) -> [u8; 8] {
    let mut args = [0u8; 8];
    args[0..4].copy_from_slice(&addr.to_le_bytes());
    args[4..8].copy_from_slice(&size.to_le_bytes());
    args
}

fn usb_err(action: &'static str) -> impl Fn(rusb::Error) -> String {
    move |e| format!("Failed to {action}: {e}")
}

pub struct Connection {
    handle: DeviceHandle<GlobalContext>,
    interface: u8,
    ep_out: u8,
    ep_in: u8,
    token: u32,
}

impl Connection {
    pub fn open() -> Result<Self, String> {
        let mut devices = bootloader_devices();
        if devices.len() > 1 {
            return Err(MULTIPLE_BOOTLOADERS.into());
        }
        let device = devices.pop().ok_or("RP2040 bootloader not found")?;
        let config = device
            .active_config_descriptor()
            .map_err(usb_err("read bootloader descriptors"))?;

        // PICOBOOT is the vendor-class interface with one bulk OUT and one bulk IN endpoint.
        let (interface, ep_out, ep_in) = config
            .interfaces()
            .flat_map(|i| i.descriptors())
            .filter(|d| d.class_code() == 0xFF)
            .find_map(|d| {
                let bulk = |dir| {
                    d.endpoint_descriptors()
                        .find(|e| e.transfer_type() == TransferType::Bulk && e.direction() == dir)
                        .map(|e| e.address())
                };
                Some((
                    d.interface_number(),
                    bulk(Direction::Out)?,
                    bulk(Direction::In)?,
                ))
            })
            .ok_or("Bootloader has no PICOBOOT interface")?;

        let handle = device.open().map_err(usb_err("open the bootloader"))?;
        handle
            .claim_interface(interface)
            .map_err(usb_err("claim the PICOBOOT interface"))?;

        let mut conn = Self {
            handle,
            interface,
            ep_out,
            ep_in,
            token: 1,
        };
        conn.reset()?;
        conn.command(PC_EXCLUSIVE_ACCESS, &[EXCLUSIVE], Data::None)?;
        Ok(conn)
    }

    /// Write `image` and reboot into it. Sector 0 holds the boot2 stage the
    /// bootrom checksums, so it is erased first and written last: if the
    /// update is interrupted, the device falls back to the USB bootloader
    /// instead of running half-written firmware.
    pub fn flash(
        mut self,
        image: &FlashImage,
        mut progress: impl FnMut(FlashPhase, f64),
    ) -> Result<(), String> {
        self.command(PC_EXIT_XIP, &[], Data::None)?;

        let sectors: Vec<(u32, &[u8])> = image.sectors().collect();
        let (boot, rest): (Vec<_>, Vec<_>) =
            sectors.iter().partition(|(addr, _)| *addr == FLASH_START);

        if !boot.is_empty() {
            self.erase(FLASH_START)?;
        }
        let total = sectors.len() as f64;
        for (done, (addr, data)) in rest.iter().chain(boot.iter()).enumerate() {
            if *addr != FLASH_START {
                self.erase(*addr)?;
            }
            self.command(
                PC_WRITE,
                &range_args(*addr, data.len() as u32),
                Data::Out(data),
            )?;
            progress(FlashPhase::Writing, (done + 1) as f64 / total);
        }

        let mut readback = vec![0u8; SECTOR_SIZE];
        for (done, (addr, data)) in sectors.iter().enumerate() {
            self.command(
                PC_READ,
                &range_args(*addr, SECTOR_SIZE as u32),
                Data::In(&mut readback),
            )?;
            if readback != *data {
                return Err(format!("Verification failed at 0x{addr:08x}"));
            }
            progress(FlashPhase::Verifying, (done + 1) as f64 / total);
        }

        let mut reboot_args = [0u8; 12];
        // PC 0 = normal boot from flash.
        reboot_args[4..8].copy_from_slice(&SRAM_END.to_le_bytes());
        reboot_args[8..12].copy_from_slice(&REBOOT_DELAY_MS.to_le_bytes());
        self.command(PC_REBOOT, &reboot_args, Data::None)
    }

    fn erase(&mut self, addr: u32) -> Result<(), String> {
        self.command(
            PC_FLASH_ERASE,
            &range_args(addr, SECTOR_SIZE as u32),
            Data::None,
        )
    }

    fn reset(&mut self) -> Result<(), String> {
        for ep in [self.ep_in, self.ep_out] {
            if self.is_halted(ep) {
                let _ = self.handle.clear_halt(ep);
            }
        }
        let request_type =
            rusb::request_type(Direction::Out, RequestType::Vendor, Recipient::Interface);
        self.handle
            .write_control(
                request_type,
                IF_RESET,
                0,
                self.interface as u16,
                &[],
                COMMAND_TIMEOUT,
            )
            .map_err(usb_err("reset the PICOBOOT interface"))?;
        Ok(())
    }

    fn is_halted(&self, ep: u8) -> bool {
        const GET_STATUS: u8 = 0x00;
        let request_type =
            rusb::request_type(Direction::In, RequestType::Standard, Recipient::Endpoint);
        let mut status = [0u8; 2];
        matches!(
            self.handle.read_control(request_type, GET_STATUS, 0, ep as u16, &mut status, COMMAND_TIMEOUT),
            Ok(2) if status[0] & 1 == 1
        )
    }

    fn command(&mut self, id: u8, args: &[u8], data: Data<'_>) -> Result<(), String> {
        let transfer_len = match &data {
            Data::None => 0,
            Data::Out(buf) => buf.len(),
            Data::In(buf) => buf.len(),
        };
        let cmd = encode_command(self.token, id, args, transfer_len as u32);
        self.token = self.token.wrapping_add(1);

        self.transfer(id, &cmd, data, transfer_len)
            .map_err(|e| match self.status_code() {
                Some(code) if code != 0 => format!("{e} (bootloader status {code})"),
                _ => e,
            })
    }

    fn transfer(
        &self,
        id: u8,
        cmd: &[u8; 32],
        data: Data<'_>,
        transfer_len: usize,
    ) -> Result<(), String> {
        let sent = self
            .handle
            .write_bulk(self.ep_out, cmd, COMMAND_TIMEOUT)
            .map_err(usb_err("send a bootloader command"))?;
        if sent != cmd.len() {
            return Err("Bootloader accepted a partial command".into());
        }

        match data {
            Data::None => {}
            Data::Out(buf) => {
                let sent = self
                    .handle
                    .write_bulk(self.ep_out, buf, TRANSFER_TIMEOUT)
                    .map_err(usb_err("send data to the bootloader"))?;
                if sent != buf.len() {
                    return Err("Bootloader accepted partial data".into());
                }
            }
            Data::In(buf) => {
                let received = self
                    .handle
                    .read_bulk(self.ep_in, buf, TRANSFER_TIMEOUT)
                    .map_err(usb_err("read data from the bootloader"))?;
                if received != buf.len() {
                    return Err("Bootloader returned partial data".into());
                }
            }
        }

        // The ack travels opposite to the data stage. Same packet sizes as picotool.
        let ack_timeout = if transfer_len == 0 {
            TRANSFER_TIMEOUT
        } else {
            COMMAND_TIMEOUT
        };
        let mut spoon = [0u8; 1];
        let ack = if id & CMD_DIR_IN != 0 {
            self.handle.write_bulk(self.ep_out, &spoon, ack_timeout)
        } else {
            self.handle.read_bulk(self.ep_in, &mut spoon, ack_timeout)
        };
        ack.map(|_| ())
            .map_err(usb_err("complete a bootloader command"))
    }

    fn status_code(&self) -> Option<u32> {
        let request_type =
            rusb::request_type(Direction::In, RequestType::Vendor, Recipient::Interface);
        let mut status = [0u8; 16];
        match self.handle.read_control(
            request_type,
            IF_CMD_STATUS,
            0,
            self.interface as u16,
            &mut status,
            COMMAND_TIMEOUT,
        ) {
            Ok(16) => Some(u32::from_le_bytes(status[4..8].try_into().unwrap())),
            _ => None,
        }
    }
}

impl Drop for Connection {
    fn drop(&mut self) {
        let _ = self.handle.release_interface(self.interface);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_command_layout() {
        let cmd = encode_command(7, PC_FLASH_ERASE, &range_args(0x1000_1000, 4096), 0);
        assert_eq!(&cmd[0..4], &[0x0B, 0xD1, 0x1F, 0x43]);
        assert_eq!(&cmd[4..8], &7u32.to_le_bytes());
        assert_eq!(cmd[8], PC_FLASH_ERASE);
        assert_eq!(cmd[9], 8);
        assert_eq!(&cmd[12..16], &[0, 0, 0, 0]);
        assert_eq!(&cmd[16..20], &0x1000_1000u32.to_le_bytes());
        assert_eq!(&cmd[20..24], &4096u32.to_le_bytes());
        assert!(cmd[24..].iter().all(|&b| b == 0));
    }

    #[test]
    fn read_is_an_in_command() {
        assert_ne!(PC_READ & CMD_DIR_IN, 0);
        assert_eq!(PC_WRITE & CMD_DIR_IN, 0);
    }
}
