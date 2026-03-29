// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include "i2c_scanner.h"
#include "i2c_master.h"

uint8_t i2c_scan(void) {
    i2c_status_t status;
    uint8_t address;
    uint8_t found_address = 0;
    uint8_t dummy_data = 0;
    
    for (address = 1; address < 127; address++) {
        // Try to read from device
        status = i2c_receive((address << 1), &dummy_data, 1, 100);
        
        if (status == I2C_STATUS_SUCCESS) {
            // Device found!
            found_address = address;
            break;
        }
    }
    
    return found_address;
}
