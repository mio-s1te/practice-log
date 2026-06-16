module.exports = {
  apps: [
    {
      name: 'mainsite',
      script: 'npx',
      args: 'vite preview --port 3000 --host 0.0.0.0',
      cwd: '/home/user/mainsite',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
}
