const GRADIENTS = [
  ['#ff6b6b', '#ee5a6f'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#30cfd0', '#330867'],
  ['#f6d365', '#fda085'],
  ['#5ee7df', '#b490ca']
];

function seedIndex(name) {
  if (!name) return 0;
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return sum % GRADIENTS.length;
}

export function getAvatarColor(name) {
  return GRADIENTS[seedIndex(name)][0];
}

export function getAvatarGradient(name) {
  const [c1, c2] = GRADIENTS[seedIndex(name)];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}