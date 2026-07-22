// Baseline profile: no skill, just the task.
module.exports = ({ vars }) => [{ role: 'user', content: vars.task }];
