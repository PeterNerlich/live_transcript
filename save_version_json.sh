#!/bin/sh

FIRSTTAG=$(git describe --tags --always --dirty='-*' 2>/dev/null)
RELEASETAG=$(git describe --tags --long --always --dirty='-*' --match 'v[0-9.][0-9.][0-9.]*' 2>/dev/null)

git --no-pager log \
  -1 --date=short --decorate=short \
  --pretty=format:"{
    \"hash\": \"%H\",
    \"abbreviatedHash\": \"%h\",
    \"treeHash\": \"%T\",
    \"abbreviatedTreeHash\": \"%t\",
    \"parentHashes\": \"%P\",
    \"abbreviatedParentHashes\": \"%p\",
    \"author\": {
        \"name\": \"%an\",
        \"email\": \"%ae\",
        \"date\": \"%ad\",
        \"unixDate\": %at,
        \"isoDate\": \"%aI\"
    },
    \"committer\": {
        \"name\": \"%cn\",
        \"email\": \"%ce\",
        \"date\": \"%cd\",
        \"unixDate\": %ct,
        \"isoDate\": \"%cI\"
    },
    \"refNames\": \"%d\",
    \"firstTag\": \"$FIRSTTAG\",
    \"releaseTag\": \"$RELEASETAG\"
}%n" HEAD > version.json
