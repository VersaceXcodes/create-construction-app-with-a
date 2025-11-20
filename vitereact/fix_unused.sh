#!/bin/bash

# UV_AdminDashboard.tsx - Remove unused React
sed -i '1s/import React, { useEffect, useState }/import { useEffect, useState }/' src/components/views/UV_AdminDashboard.tsx

echo "Fixed UV_AdminDashboard imports"
