#!/bin/bash
# One-time setup steps that need sudo, deferred from the initial setup
# that set up the rest of the Android/React Native toolchain (Node via nvm,
# JDK via SDKMAN, Android SDK, AVD — all installed without sudo).
#
# Run this yourself: bash ~/AmrutkanApp/setup-sudo-steps.sh
#
# After it finishes, log out and back in (or reboot) — the kvm group change
# does not take effect in your current session.

set -e

echo "Installing git..."
sudo apt install -y git

echo "Adding $USER to the kvm group (for hardware-accelerated Android emulator)..."
sudo usermod -aG kvm "$USER"

echo
echo "Done. Log out and back in (or reboot) for the kvm group change to take effect."
