/**
 * glyf firmware – main entry point
 *
 * Initialises display + touch, then enters a poll loop that:
 *  1. Checks for incoming USB HID commands
 *  2. Reads touch state
 *  3. Sends state reports back to host on demand
 */

#include "pico/stdlib.h"
#include "tusb.h"

#include "pinout.h"
#include "display/st7796s.h"
#include "touch/xpt2046.h"
#include "hid/hid_handler.h"

// ---------------------------------------------------------------------------
// TinyUSB HID callbacks
// ---------------------------------------------------------------------------

// Invoked when host sends a SET_REPORT (output report / vendor report)
void tud_hid_set_report_cb(
    uint8_t itf, uint8_t report_id,
    hid_report_type_t report_type,
    const uint8_t *buffer, uint16_t bufsize)
{
    (void)itf; (void)report_id; (void)report_type;

    if (buffer == NULL || bufsize == 0) {
        return;
    }

    // macOS hidapi writes often include a leading 0x00 report ID even when the
    // descriptor has no numbered reports. Accept both formats.
    const uint8_t *payload = buffer;
    uint16_t payload_len = bufsize;
    if (payload_len > 1 && payload[0] == 0x00) {
        payload += 1;
        payload_len -= 1;
    }

    if (payload_len == 0) {
        return;
    }

    hid_handle_report(payload, payload_len);

    // Immediately send state report back
    if (payload[0] == CMD_POLL_STATE) {
        uint8_t report[GLYF_HID_REPORT_SIZE];
        hid_build_state_report(report);
        tud_hid_report(0, report, GLYF_HID_REPORT_SIZE);
    }
}

// Invoked when host requests a GET_REPORT
uint16_t tud_hid_get_report_cb(
    uint8_t itf, uint8_t report_id,
    hid_report_type_t report_type,
    uint8_t *buffer, uint16_t reqlen)
{
    (void)itf; (void)report_id; (void)report_type;
    uint16_t len = (reqlen < GLYF_HID_REPORT_SIZE) ? reqlen : GLYF_HID_REPORT_SIZE;
    hid_build_state_report(buffer);
    return len;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main(void) {
    stdio_init_all();

    // Initialise display (also sets up SPI1 and GPIO)
    st7796s_init();
    st7796s_fill(COLOR_BLACK);

    // Initialise touch (reuses SPI1)
    xpt2046_init();

    // Initialise USB HID
    tusb_init();

    // Splash: brief white flash to confirm display is working
    sleep_ms(50);
    st7796s_fill(COLOR_WHITE);
    sleep_ms(100);
    st7796s_fill(COLOR_BLACK);

    while (true) {
        tud_task(); // TinyUSB device task
    }

    return 0;
}
