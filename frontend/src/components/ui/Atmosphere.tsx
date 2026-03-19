"use client";

import React from "react";
import { motion } from "framer-motion";

export function Atmosphere() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Light Mode Blobs */}
      <div className="absolute inset-0 bg-[#f8f9fa] dark:hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-purple-100/30 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-indigo-50/50 rounded-full blur-[80px]"
        />
      </div>

      {/* Dark Mode Blobs */}
      <div className="absolute inset-0 bg-[#02040a] hidden dark:block">
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[160px]"
        />
        <motion.div
          animate={{
            x: [0, -60, 0],
            y: [0, 100, 0],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-[10%] right-[0%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.04, 0.1, 0.04],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-[30%] left-[25%] w-[40%] h-[40%] bg-slate-800/20 rounded-full blur-[110px]"
        />
      </div>
      
      {/* Noise Overlay for Texture */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
