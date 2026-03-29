// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

#include <stdint.h>

// Scan I2C bus and return first found device address
// Returns 0 if no device found
uint8_t i2c_scan(void);
