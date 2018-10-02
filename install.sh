#!/bin/bash

#run from *this* directory
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

function prereqsInstall() {
	(bash $parent_path/prereqs_install.sh)
}


	echo "
Starting MoogSoft Package Installer
Currently support versions ${supported_versions[@]}
Please enter a version number to confirm installation to default single server install.  

${bold}***** This WILL START THE INSTALL *****${unbold}
"
prereqsInstall


