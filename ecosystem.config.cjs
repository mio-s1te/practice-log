module.exports = {
  apps: [
    {
      name: 'mainsite',
      script: 'npx',
      args: 'vite preview',
      cwd: '/home/user/mainsite',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
}
