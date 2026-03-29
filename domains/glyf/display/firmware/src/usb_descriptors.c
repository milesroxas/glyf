/**
 * TinyUSB device / configuration / string / HID report descriptors for glyf.
 */

#include "bsp/board_api.h"
#include "hid/hid_handler.h"
#include "pinout.h"
#include "tusb.h"
#include "tusb_config.h"

#include <string.h>

//--------------------------------------------------------------------+
// Device descriptor
//--------------------------------------------------------------------+

tusb_desc_device_t const desc_device = {
    .bLength = sizeof(tusb_desc_device_t),
    .bDescriptorType = TUSB_DESC_DEVICE,
    .bcdUSB = 0x0200,
    .bDeviceClass = 0x00,
    .bDeviceSubClass = 0x00,
    .bDeviceProtocol = 0x00,
    .bMaxPacketSize0 = CFG_TUD_ENDPOINT0_SIZE,
    .idVendor = USB_VID,
    .idProduct = USB_PID,
    .bcdDevice = 0x0100,
    .iManufacturer = 0x01,
    .iProduct = 0x02,
    .iSerialNumber = 0x03,
    .bNumConfigurations = 0x01,
};

uint8_t const *tud_descriptor_device_cb(void) {
    return (uint8_t const *)&desc_device;
}

//--------------------------------------------------------------------+
// HID report descriptor — Raw HID usage page 0xFF60 (matches host + QMK-style)
//--------------------------------------------------------------------+

uint8_t const desc_hid_report[] = {
    HID_USAGE_PAGE_N(0xFF60, 2),
    HID_USAGE(0x01),
    HID_COLLECTION(HID_COLLECTION_APPLICATION),
    HID_USAGE(0x02),
    HID_LOGICAL_MIN(0x00),
    HID_LOGICAL_MAX_N(0xff, 2),
    HID_REPORT_SIZE(8),
    HID_REPORT_COUNT(GLYF_HID_REPORT_SIZE),
    HID_INPUT(HID_DATA | HID_VARIABLE | HID_ABSOLUTE),
    HID_USAGE(0x03),
    HID_LOGICAL_MIN(0x00),
    HID_LOGICAL_MAX_N(0xff, 2),
    HID_REPORT_SIZE(8),
    HID_REPORT_COUNT(GLYF_HID_REPORT_SIZE),
    HID_OUTPUT(HID_DATA | HID_VARIABLE | HID_ABSOLUTE),
    HID_COLLECTION_END};

uint8_t const *tud_hid_descriptor_report_cb(uint8_t itf) {
    (void)itf;
    return desc_hid_report;
}

//--------------------------------------------------------------------+
// Configuration descriptor
//--------------------------------------------------------------------+

enum { ITF_NUM_HID, ITF_NUM_TOTAL };

#define CONFIG_TOTAL_LEN (TUD_CONFIG_DESC_LEN + TUD_HID_INOUT_DESC_LEN)
#define EPNUM_HID 0x01

uint8_t const desc_configuration[] = {
    TUD_CONFIG_DESCRIPTOR(1, ITF_NUM_TOTAL, 0, CONFIG_TOTAL_LEN, 0x00, 100),
    TUD_HID_INOUT_DESCRIPTOR(ITF_NUM_HID, 0, HID_ITF_PROTOCOL_NONE, sizeof(desc_hid_report),
                             EPNUM_HID, 0x80 | EPNUM_HID, CFG_TUD_HID_EP_BUFSIZE, 10),
};

uint8_t const *tud_descriptor_configuration_cb(uint8_t index) {
    (void)index;
    return desc_configuration;
}

//--------------------------------------------------------------------+
// String descriptors
//--------------------------------------------------------------------+

enum { STRID_LANGID = 0, STRID_MANUFACTURER, STRID_PRODUCT, STRID_SERIAL };

static char const *string_desc_arr[] = {
    (const char[]){0x09, 0x04},
    USB_MANUFACTURER_STRING,
    USB_PRODUCT_STRING,
    USB_SERIAL_STRING,
};

static uint16_t _desc_str[32 + 1];

uint16_t const *tud_descriptor_string_cb(uint8_t index, uint16_t langid) {
    (void)langid;
    size_t chr_count;

    switch (index) {
    case STRID_LANGID:
        memcpy(&_desc_str[1], string_desc_arr[0], 2);
        chr_count = 1;
        break;

    case STRID_SERIAL:
        chr_count = board_usb_get_serial(_desc_str + 1, 32);
        break;

    default:
        if (index >= sizeof(string_desc_arr) / sizeof(string_desc_arr[0])) {
            return NULL;
        }
        const char *str = string_desc_arr[index];
        chr_count = strlen(str);
        size_t const max_count = sizeof(_desc_str) / sizeof(_desc_str[0]) - 1;
        if (chr_count > max_count) {
            chr_count = max_count;
        }
        for (size_t i = 0; i < chr_count; i++) {
            _desc_str[1 + i] = str[i];
        }
        break;
    }

    _desc_str[0] = (uint16_t)((TUSB_DESC_STRING << 8) | (2 * chr_count + 2));
    return _desc_str;
}
