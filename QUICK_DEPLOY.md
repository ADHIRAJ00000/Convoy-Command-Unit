# 🚀 Quick Deploy Reference Card

## ⚡ Fast Track Deployment (15 minutes)

### 1️⃣ Backend - Render (5 mins)

```bash
# Push to GitHub
git add . && git commit -m "Deploy to Render" && git push origin main
```

**Render Dashboard:**
1. New + → Blueprint → Connect GitHub
2. Select `render.yaml`
3. Add environment variables:
   - `MONGODB_URI` = Your MongoDB Atlas connection string
   - `CORS_ORIGINS` = `https://your-app.vercel.app`
   - `JWT_SECRET` = Generate random string

**Get MongoDB URI:**
- Go to https://cloud.mongodb.com
- Connect → Drivers → Copy connection string
- Replace `<password>` with actual password

---

### 2️⃣ Frontend - Vercel (5 mins)

```bash
cd Frontend
git push origin main
```

**Vercel Dashboard:**
1. Import Project → Select GitHub repo
2. Root Directory: `Frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` = Your Mapbox token
   - `NEXT_PUBLIC_API_URL` = `https://hawkroute-backend.onrender.com`

---

### 3️⃣ Test Everything (5 mins)

```bash
# Test backend
curl https://hawkroute-backend.onrender.com/health

# Test frontend
open https://your-app.vercel.app

# Check for CORS errors in browser console
```

---

## 🔑 Environment Variables Cheat Sheet

### Backend (Render)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hawkroute
CORS_ORIGINS=https://your-app.vercel.app
JWT_SECRET=<run command below>
```

Generate JWT:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_weather_api_key
NEXT_PUBLIC_API_URL=https://hawkroute-backend.onrender.com
```

---

## 🆘 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| ❌ CORS errors | Update `CORS_ORIGINS` in Render dashboard |
| ❌ MongoDB error | Check connection string, whitelist IP `0.0.0.0/0` |
| ❌ Build fails | Clear cache: `rm -rf node_modules package-lock.json` |
| ❌ WebSocket fail | Check CORS includes both frontend & backend URLs |
| ❌ Env not working | Redeploy after adding variables |

---

## ✅ Success Checklist

- [ ] Backend health returns 200
- [ ] Frontend loads without errors
- [ ] No CORS errors in console
- [ ] Can login/register
- [ ] Map displays correctly
- [ ] Real-time updates working

---

## 📊 URLs You'll Need

- **Render Dashboard:** https://dashboard.render.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Mapbox Tokens:** https://account.mapbox.com/access-tokens
- **OpenWeather API:** https://home.openweathermap.org/api_keys

---

## 🔄 Update Workflow

```bash
# Make changes
git add . && git commit -m "Update feature" && git push

# Both platforms auto-deploy on push to main!
```

---

## 💰 Cost Summary

**Minimum viable deployment:**
- Render Starter: $7/month
- Vercel Free: $0
- MongoDB Free Tier: $0
- **Total: $7/month**

---

**🎯 You're ready to deploy! Follow the steps above and you'll be live in 15 minutes.**
