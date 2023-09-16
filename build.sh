#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 <option>"
    exit 1
fi


# Check the user's choice and take action accordingly
case $1 in
  1)
      sudo docker-compose -f backend/docker-compose.dev.yml up -d --build 
    ;;
  2)
      sudo docker-compose -f frontend/docker-compose.dev.yml up -d --build
    ;;
      *)
    echo "Invalid choice. Please select a valid option."
    ;;
esac
