export const resolveUrl = (baseUrl, target) => {
  if (!target) {
    return null;
  }

  if (target.startsWith('data:')) {
    return target;
  }

  try {
    return new URL(target, baseUrl).toString();
  } catch {
    return target;
  }
};
