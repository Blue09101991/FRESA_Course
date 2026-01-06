# Ubuntu Server Deployment Guide

Complete guide for deploying the E-Course application to an Ubuntu server.

## Prerequisites

- Ubuntu 20.04 LTS or later (recommended: 22.04 LTS)
- Root or sudo access
- Domain name (optional, for production)
- SSH access to the server

---

## Step 1: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 2: Install Node.js and npm

### Option A: Using NodeSource (Recommended - Latest LTS)

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Option B: Using Ubuntu Repository

```bash
sudo apt install -y nodejs npm
```

---

## Step 3: Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE e_course;
CREATE USER e_course_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE e_course TO e_course_user;
ALTER DATABASE e_course OWNER TO e_course_user;
\q
```

**Note:** Replace `your_secure_password_here` with a strong password!

---

## Step 4: Install Python and Whisper Dependencies

### Install Python 3.10+

```bash
# Install Python and pip
sudo apt install -y python3 python3-pip python3-venv

# Verify installation
python3 --version  # Should show 3.10 or higher
pip3 --version
```

### Install FFmpeg (Required for Whisper)

```bash
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

### Install Whisper Dependencies

```bash
# Install Whisper and PyTorch
pip3 install --upgrade pip
pip3 install torch>=2.0.0
pip3 install whisper-timestamped>=1.14.0
pip3 install openai-whisper>=20231117

# Verify installation
python3 -c "import whisper_timestamped; print('Whisper installed successfully')"
```

**Note:** If you have an NVIDIA GPU, PyTorch will automatically use CUDA for faster processing.

---

## Step 5: Clone and Setup Project

### Clone Repository

```bash
# Navigate to your preferred directory (e.g., /var/www or /opt)
cd /var/www  # or your preferred location

# Clone your repository
git clone <your-repository-url> e_course
cd e_course

# Or if you're uploading files manually, extract them here
```

### Install Node.js Dependencies

```bash
# Install all npm packages
npm install

# If you encounter issues, try:
npm install --legacy-peer-deps
```

---

## Step 6: Configure Environment Variables

### Create .env File

```bash
# Copy the template (if exists) or create new
cp env.template .env
nano .env  # or use your preferred editor
```

### Required Environment Variables

```env
# Database Configuration
DATABASE_URL="postgresql://e_course_user:your_secure_password_here@localhost:5432/e_course?schema=public"

# JWT Secret (Generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"

# ElevenLabs API Configuration
ELEVENLABS_API_KEY="your-elevenlabs-api-key-here"
ELEVENLABS_MAN_VOICE_ID="nPczCjzI2devNBz1zQrb"
ELEVENLABS_WOMAN_VOICE_ID="GP1bgf0sjoFuuHkyrg8E"

# Node Environment
NODE_ENV="production"
```

### Generate JWT Secret

```bash
# Generate a secure random string for JWT_SECRET
openssl rand -base64 32
```

Copy the output and paste it as your `JWT_SECRET` value.

---

## Step 7: Database Migration

### Generate Prisma Client

```bash
npm run db:generate
```

### Run Database Migrations

```bash
# Run migrations to create all tables
npx prisma migrate deploy

# Or if using dev migrations:
npx prisma migrate dev
```

### Seed Initial Data (Optional)

```bash
# Seed the database with initial content
npm run db:seed
```

### Create Admin User

```bash
# Create a super admin user
npm run create-super-admin
```

Follow the prompts to create your admin account.

---

## Step 8: Build the Application

```bash
# Build the Next.js application for production
npm run build
```

This will create an optimized production build in the `.next` directory.

---

## Step 9: Setup Process Manager (PM2)

### Install PM2

```bash
sudo npm install -g pm2
```

### Create PM2 Ecosystem File

Create `ecosystem.config.js` in the project root:

```javascript
module.exports = {
  apps: [{
    name: 'e-course',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/e_course', // Change to your project path
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

### Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown by the command
```

### PM2 Useful Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs e-course

# Restart application
pm2 restart e-course

# Stop application
pm2 stop e-course

# Monitor
pm2 monit
```

---

## Step 10: Setup Nginx Reverse Proxy (Recommended)

### Install Nginx

```bash
sudo apt install -y nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/e-course
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain

    # Increase upload size for audio files
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings for long-running requests (audio generation)
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Serve static files directly (optional optimization)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Serve audio and timestamps files
    location /audio {
        alias /var/www/e_course/public/audio;  # Change to your project path
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /timestamps {
        alias /var/www/e_course/public/timestamps;  # Change to your project path
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/e-course /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 11: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

---

## Step 12: Setup Firewall

```bash
# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 13: Create Required Directories

```bash
# Create directories for audio and timestamps
mkdir -p public/audio
mkdir -p public/timestamps
mkdir -p logs

# Set proper permissions
chmod -R 755 public
```

---

## Step 14: Verify Deployment

1. **Check Application Status:**
   ```bash
   pm2 status
   pm2 logs e-course --lines 50
   ```

2. **Check Database Connection:**
   ```bash
   npx prisma studio
   # This should open Prisma Studio if database is connected
   ```

3. **Test the Application:**
   - Visit `http://your-server-ip` or `http://your-domain.com`
   - Check if the homepage loads
   - Try logging into the admin panel

---

## Step 15: Post-Deployment Tasks

### Create Admin User (if not done)

```bash
npm run create-super-admin
```

### Initialize Database Content (if needed)

```bash
npm run db:seed
```

### Monitor Application

```bash
# View real-time logs
pm2 logs e-course

# Monitor resources
pm2 monit
```

---

## Troubleshooting

### Application Won't Start

1. **Check logs:**
   ```bash
   pm2 logs e-course
   ```

2. **Check environment variables:**
   ```bash
   cat .env
   ```

3. **Verify database connection:**
   ```bash
   psql -U e_course_user -d e_course -h localhost
   ```

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Check PostgreSQL configuration:**
   ```bash
   sudo nano /etc/postgresql/*/main/postgresql.conf
   # Ensure listen_addresses = 'localhost' or '*'
   ```

3. **Check pg_hba.conf:**
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   # Ensure local connections are allowed
   ```

### Whisper Not Working

1. **Check Python installation:**
   ```bash
   python3 --version
   pip3 list | grep whisper
   ```

2. **Check FFmpeg:**
   ```bash
   ffmpeg -version
   ```

3. **Test Whisper manually:**
   ```bash
   python3 -c "import whisper_timestamped; print('OK')"
   ```

### Audio Files Not Accessible

1. **Check file permissions:**
   ```bash
   ls -la public/audio/
   chmod -R 755 public/audio
   ```

2. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Port Already in Use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill the process or change port in ecosystem.config.js
```

---

## Maintenance

### Update Application

```bash
cd /var/www/e_course
git pull  # or upload new files
npm install
npm run build
pm2 restart e-course
```

### Backup Database

```bash
# Create backup
pg_dump -U e_course_user e_course > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U e_course_user e_course < backup_20240101.sql
```

### Update Dependencies

```bash
npm update
npm run build
pm2 restart e-course
```

---

## Security Checklist

- [ ] Changed default PostgreSQL password
- [ ] Generated secure JWT_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configured firewall (UFW)
- [ ] Setup SSL certificate (Let's Encrypt)
- [ ] Restricted database user permissions
- [ ] Secured .env file (chmod 600)
- [ ] Regular backups configured
- [ ] PM2 auto-restart enabled
- [ ] Nginx security headers configured

---

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Support

If you encounter issues:

1. Check application logs: `pm2 logs e-course`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -u nginx`
4. Verify all environment variables are set correctly
5. Ensure all services are running: `sudo systemctl status postgresql nginx`

---

**Last Updated:** 2024
