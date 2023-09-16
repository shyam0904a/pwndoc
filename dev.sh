#!/bin/bash

sudo docker-compose -f frontend/docker-compose.dev.yml stop && sudo docker-compose -f backend/docker-compose.dev.yml stop
