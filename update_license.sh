#!/bin/bash

echo
echo -n "****MOOGSOFT 6.5 AUTOMATED LICENSE INSTALL****"
echo

cat > /tmp/license.sql << EOL
DELETE FROM licence_info;
INSERT INTO licence_info VALUES ("$MOOGLICENSE");
EOL

export MOOGSOFT_HOME=/usr/share/moogsoft

MOOGDB=$($MOOGSOFT_HOME/bin/utils/moog_config_reader --k mysql.moogdb_database_name)

i###############################
# Import License
###############################
mysql -u root -p$MySQLPASS -D $MOOGDB < /tmp/license.sql
