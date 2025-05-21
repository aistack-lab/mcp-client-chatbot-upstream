"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const Greeting = () => {
  const { data: session } = useSession();

  const user = session?.user;

  const greeting = getGreetingByTime();

  return (
    <motion.div
      key="welcome"
      className="max-w-3xl mx-auto my-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center">
        <div className="flex justify-center mb-4">
          <motion.img 
            src="/logo.png" 
            alt="Logo" 
            className="h-40 w-auto invert dark:invert-0 filter drop-shadow-md" 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <h1 className="text-4xl font-semibold">
          {greeting}, {user?.name}
        </h1>
        <div className="text-muted-foreground text-4xl">
          <p>How can I help you today?</p>
        </div>
      </div>
    </motion.div>
  );
};
