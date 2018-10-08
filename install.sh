#!/bin/bash

#run from *this* directory
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

function prereqsInstall() {
	(bash $parent_path/prereqs_install.sh)
}

function moogInstall() {
	(bash $parent_path/moog_6.5_install.sh)
}

function licenseInstall() {
	(bash $parent_path/update_license.sh)
}

	echo "
Starting MoogSoft Package Installer

${bold}***** This WILL START THE INSTALL *****${unbold}
"
prereqsInstall
moogInstall
licenseInstall


