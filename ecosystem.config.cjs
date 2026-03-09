// PM2 конфиг для production деплоя 
// Запуск: pm2 start ecosystem.config.cjs
module.exports = {
    apps: [
        {
            name: 'moliya-backend',
            script: 'src/server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            // Логи
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            // Авто-рестарт при краше
            exp_backoff_restart_delay: 100,
        }
    ]
};
