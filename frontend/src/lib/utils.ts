export const getImageUrl = (path?: string | null) => {
  if (!path) return 'https://placehold.co/800x800/eeeeee/333333/png?text=No+Image';
  if (path.startsWith('http')) return path;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};
