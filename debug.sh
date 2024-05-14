#!/bin/bash
set -e

export G_MESSAGES_DEBUG=all
export G_MESSAGES_DEBUG=all
export SHELL_DEBUG=all
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
export SHELL_DEBUG=all
export MUTTER_DEBUG_NUM_DUMMY_MONITORS=2
dbus-run-session -- gnome-shell --nested --wayland > /dev/null
