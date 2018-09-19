#!/bin/bash

#run from *this* directory
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

function prereqsInstall() {
	(bash $parent_path/prereqs_install.sh)
}

function moogInstall() {
	(bash $parent_path/moog_${version}_install.sh)
}

supported_versions=('6.4' '6.5')

while [[ true ]]; do
	echo "
Starting MoogSoft Package Installer
Currently support versions ${supported_versions[@]}
Please enter a version number to confirm installation to default single server install.  

${bold}***** This WILL START THE INSTALL *****${unbold}
"
read -p "Please enter a valid version: " -r
echo
		for version in "${supported_versions[@]}"
		do 
                	if [[ $REPLY == $version ]]; then
				prereqsInstall
				if [[ $1 != "PreOnly" ]]; then
					moogInstall
				fi
				exit
			fi
		done

	echo "invalid version specified: ${REPLY} - please try again or ctrl-c"
done
