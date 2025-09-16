/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
const res = await fetch(url, {
  headers: {
    Authorization: auth,
    Accept: "application/xml",
  },
  cache: "no-store",
  redirect: "follow", // 🚀 heel belangrijk!
});
