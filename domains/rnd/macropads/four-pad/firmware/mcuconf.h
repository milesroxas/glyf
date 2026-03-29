// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

#include_next <mcuconf.h>

// Enable I2C1 peripheral
#undef RP_I2C_USE_I2C1
#define RP_I2C_USE_I2C1 TRUE
