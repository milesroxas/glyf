// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

// Firmware version reported to the companion app (M11_HID_CMD_GET_INFO).
// Bump on every release: the app offers an update when its bundled firmware
// is newer than what the device reports. build.sh reads these three lines.
#define MACRO_ELEVEN_FW_VERSION_MAJOR 1
#define MACRO_ELEVEN_FW_VERSION_MINOR 1
#define MACRO_ELEVEN_FW_VERSION_PATCH 1
