# Euler 3D

<p align="center">
  <img src="./logo.png" alt="Euler 3D Logo" width="450" />
</p>

<p align="center">
  <b>Real-Time GPU Computational Fluid Dynamics & 3D Vector Simulation</b>
</p>

<p align="center">
  <a href="https://umangnamdeo.github.io/Euler-3D/"><strong>Explore Live Simulation »</strong></a>
</p>

---

## ⚡ Overview

**Euler 3D** is an interactive, browser-based numerical simulation engine designed to compute and visualize complex fluid behavior, vector fields, and spatial dynamics directly inside modern web browsers.

By leveraging WebGL and custom GLSL fragment shaders, continuous partial differential equations (the Euler equations for fluid flow) are mapped onto GPU floating-point textures. This parallelized solver pipeline calculates velocity advection, pressure projection, and vorticity confinement in real time, delivering a responsive 60 FPS visual experience with zero local installation or plugins.

---



## ✨ Features

* **GPU-Accelerated Solving:** Solves velocity, density, and pressure fields concurrently on the GPU using ping-pong framebuffers.
* **Interactive Controls:** Direct pointer interaction allows users to perturb fluid paths, inject momentum, and place virtual obstacles.
* **Volumetric & Vector Modes:** Switch dynamically between raymarched volumetric density fields, particle streamlines, and directional vector paths.
* **Pure Web Stack:** Zero heavyweight backend dependencies—runs natively on any WebGL-compatible desktop or mobile browser.

---

## 🛠️ Tech Stack

* **Rendering Engine:** WebGL / Three.js
* **Shading Language:** GLSL (Fragment & Vertex Shaders)
* **Frontend Logic:** Modern JavaScript (ES6+), React 19, TypeScript, Tailwind CSS
* **Backend & Auth:** Supabase (PostgreSQL with Row-Level Security)
* **Deployment:** GitHub Pages

---

## 🗄️ Supabase Backend Setup

Euler 3D comes with full Supabase integration for authentication and cloud preset storage:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL script from `supabase-schema.sql` in the Supabase SQL Editor.
3. Add your credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Configure Site URL & Redirect URLs under **Authentication** -> **URL Configuration**:
   - `https://umangnamdeo.github.io/Euler-3D/`
   - `http://localhost:3000/`

---

