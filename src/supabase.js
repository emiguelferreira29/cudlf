// src/supabase.js
import { createClient } from '@supabase/supabase-js'

// Substitua com os seus dados que estão no Supabase (Project Settings -> API)
const supabaseUrl = 'https://cdsjibuvsikqomjwggft.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkc2ppYnV2c2lrcW9tandnZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDI3NDMsImV4cCI6MjEwODU3ODc0M30.AMbYUv0_aMl4hcP9G8s6Fp3z_Kd8BZjAhNfqvptoKrY'

export const supabase = createClient(supabaseUrl, supabaseKey)