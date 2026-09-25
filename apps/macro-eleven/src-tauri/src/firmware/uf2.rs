//! UF2 parsing for RP2040 firmware images.
//!
//! Format: https://github.com/microsoft/uf2. Each 512-byte block carries up
//! to 476 payload bytes; RP2040 images always use 256-byte payloads, one
//! flash page per block.

use std::collections::BTreeMap;

const BLOCK_SIZE: usize = 512;
const MAGIC_START0: u32 = 0x0A32_4655;
const MAGIC_START1: u32 = 0x9E5D_5157;
const MAGIC_END: u32 = 0x0AB1_6F30;
const FLAG_NOT_MAIN_FLASH: u32 = 0x0000_0001;
const FLAG_FAMILY_ID_PRESENT: u32 = 0x0000_2000;
const RP2040_FAMILY_ID: u32 = 0xE48B_FF56;

pub const FLASH_START: u32 = 0x1000_0000;
/// RP2040 XIP window; the bootrom rejects addresses beyond it.
const FLASH_END: u32 = FLASH_START + 16 * 1024 * 1024;
pub const PAGE_SIZE: usize = 256;
pub const SECTOR_SIZE: usize = 4096;

/// Flash contents of a UF2 file, grouped into 4 KB erase sectors.
#[derive(Debug)]
pub struct FlashImage {
    /// Sector base address -> sector contents. Bytes the image doesn't cover
    /// stay 0xFF (erased flash), so writing a whole sector is harmless.
    sectors: BTreeMap<u32, Vec<u8>>,
}

impl FlashImage {
    pub fn parse(bytes: &[u8]) -> Result<Self, String> {
        if bytes.is_empty() || !bytes.len().is_multiple_of(BLOCK_SIZE) {
            return Err("Firmware file is not a valid UF2 image".into());
        }

        let mut sectors: BTreeMap<u32, Vec<u8>> = BTreeMap::new();
        for (index, block) in bytes.chunks_exact(BLOCK_SIZE).enumerate() {
            let word =
                |offset: usize| u32::from_le_bytes(block[offset..offset + 4].try_into().unwrap());
            if word(0) != MAGIC_START0 || word(4) != MAGIC_START1 || word(508) != MAGIC_END {
                return Err(format!("UF2 block {index} has a bad magic number"));
            }

            let flags = word(8);
            let target_addr = word(12);
            let payload_size = word(16) as usize;
            let family_id = word(28);

            if flags & FLAG_NOT_MAIN_FLASH != 0 {
                continue;
            }
            if flags & FLAG_FAMILY_ID_PRESENT == 0 || family_id != RP2040_FAMILY_ID {
                return Err(format!("UF2 block {index} is not built for the RP2040"));
            }
            if payload_size != PAGE_SIZE || !(target_addr as usize).is_multiple_of(PAGE_SIZE) {
                return Err(format!("UF2 block {index} is not a 256-byte flash page"));
            }
            if target_addr < FLASH_START || target_addr > FLASH_END - PAGE_SIZE as u32 {
                return Err(format!(
                    "UF2 block {index} targets 0x{target_addr:08x}, outside flash"
                ));
            }

            let sector_addr = target_addr & !(SECTOR_SIZE as u32 - 1);
            let offset = (target_addr - sector_addr) as usize;
            let sector = sectors
                .entry(sector_addr)
                .or_insert_with(|| vec![0xFF; SECTOR_SIZE]);
            sector[offset..offset + PAGE_SIZE].copy_from_slice(&block[32..32 + PAGE_SIZE]);
        }

        if sectors.is_empty() {
            return Err("UF2 image contains no flash data".into());
        }
        Ok(Self { sectors })
    }

    /// Sectors in ascending address order.
    pub fn sectors(&self) -> impl Iterator<Item = (u32, &[u8])> {
        self.sectors
            .iter()
            .map(|(addr, data)| (*addr, data.as_slice()))
    }

    pub fn sector_count(&self) -> usize {
        self.sectors.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn block(flags: u32, addr: u32, family: u32, fill: u8) -> Vec<u8> {
        let mut b = vec![0u8; BLOCK_SIZE];
        let mut put =
            |offset: usize, value: u32| b[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
        put(0, MAGIC_START0);
        put(4, MAGIC_START1);
        put(8, flags);
        put(12, addr);
        put(16, PAGE_SIZE as u32);
        put(28, family);
        put(508, MAGIC_END);
        b[32..32 + PAGE_SIZE].fill(fill);
        b
    }

    fn rp2040_block(addr: u32, fill: u8) -> Vec<u8> {
        block(FLAG_FAMILY_ID_PRESENT, addr, RP2040_FAMILY_ID, fill)
    }

    #[test]
    fn groups_pages_into_padded_sectors() {
        let bytes = [
            rp2040_block(FLASH_START, 0xAA),
            rp2040_block(FLASH_START + 0x100, 0xBB),
            rp2040_block(FLASH_START + 0x2000, 0xCC),
        ]
        .concat();
        let image = FlashImage::parse(&bytes).unwrap();
        let sectors: Vec<_> = image.sectors().collect();

        assert_eq!(sectors.len(), 2);
        assert_eq!(sectors[0].0, FLASH_START);
        assert!(sectors[0].1[..0x100].iter().all(|&b| b == 0xAA));
        assert!(sectors[0].1[0x100..0x200].iter().all(|&b| b == 0xBB));
        assert!(sectors[0].1[0x200..].iter().all(|&b| b == 0xFF));
        assert_eq!(sectors[1].0, FLASH_START + 0x2000);
    }

    #[test]
    fn skips_non_flash_blocks() {
        let bytes = [
            rp2040_block(FLASH_START, 0xAA),
            block(FLAG_NOT_MAIN_FLASH, 0x2000_0000, 0, 0x11),
        ]
        .concat();
        assert_eq!(FlashImage::parse(&bytes).unwrap().sector_count(), 1);
    }

    #[test]
    fn rejects_other_families() {
        let bytes = block(FLAG_FAMILY_ID_PRESENT, FLASH_START, 0xE48B_FF59, 0);
        assert!(FlashImage::parse(&bytes).is_err());
    }

    #[test]
    fn rejects_addresses_outside_flash() {
        assert!(FlashImage::parse(&rp2040_block(0x2000_0000, 0)).is_err());
        assert!(FlashImage::parse(&rp2040_block(FLASH_END, 0)).is_err());
    }

    #[test]
    fn rejects_truncated_files() {
        let mut bytes = rp2040_block(FLASH_START, 0);
        bytes.pop();
        assert!(FlashImage::parse(&bytes).is_err());
        assert!(FlashImage::parse(&[]).is_err());
    }
}
