/**
 * TinyUSB configuration for glyf
 *
 * Raw HID device on usage page 0xFF60 (matches QMK convention so the
 * companion app's hidapi code works identically to macro-eleven).
 */

#pragma once

#include "pinout.h"

#define CFG_TUSB_RHPORT0_MODE     OPT_MODE_DEVICE

// HID
#define CFG_TUD_HID               1
#define CFG_TUD_HID_EP_BUFSIZE    64

// No CDC, MSC, MIDI
#define CFG_TUD_CDC               0
#define CFG_TUD_MSC               0
#define CFG_TUD_MIDI              0
#define CFG_TUD_VENDOR            0

// USB descriptor strings
#define USB_MANUFACTURER_STRING   "milesroxas"
#define USB_PRODUCT_STRING        "glyf"
#define USB_SERIAL_STRING         "0001"
