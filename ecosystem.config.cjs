module.exports = {
  apps: [
    {
      name: "sara-server",
      cwd: "/var/www/saralearn-anythingllm/server",
      script: "./index.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      out_file: "/var/log/pm2/sara-server.out.log",
      error_file: "/var/log/pm2/sara-server.err.log",
      time: true,
    },
    {
      name: "sara-collector",
      cwd: "/var/www/saralearn-anythingllm/collector",
      script: "./index.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
      out_file: "/var/log/pm2/sara-collector.out.log",
      error_file: "/var/log/pm2/sara-collector.err.log",
      time: true,
    },
  ],
};
