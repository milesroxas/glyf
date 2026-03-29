cmake_minimum_required(VERSION 3.13)

# Pull in Pico SDK (must be set before project())
include(pico_sdk_import.cmake)

project(glyf C CXX ASM)
set(CMAKE_C_STANDARD   11)
set(CMAKE_CXX_STANDARD 17)

pico_sdk_init()

add_executable(glyf
    src/main.c
    src/usb_descriptors.c
    src/display/st7796s.c
    src/touch/xpt2046.c
    src/hid/hid_handler.c
)

target_include_directories(glyf PRIVATE src)

target_link_libraries(glyf
    pico_stdlib
    hardware_spi
    hardware_gpio
    hardware_pwm
    tinyusb_device
    tinyusb_board
)

# USB descriptors
target_compile_definitions(glyf PRIVATE
    PICO_RP2040_USB_DEVICE_ENUMERATION_FIX=1
    CFG_TUSB_CONFIG_FILE="tusb_config.h"
)

# Generate UF2 and map files
pico_add_extra_outputs(glyf)

# Disable UART stdio (use USB CDC for debug if needed)
pico_enable_stdio_uart(glyf 0)
pico_enable_stdio_usb(glyf 0)
