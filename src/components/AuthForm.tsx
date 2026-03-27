"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
  name: string;
  email: string;
  phone: string;
  isAdmin: boolean;
}

interface AuthFormProps {
  onLogin: (user: User) => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !phone) {
      setError("Заполните все поля");
      return;
    }

    if (!isLogin) {
      if (!name) {
        setError("Введите имя");
        return;
      }
      // Регистрация - сохраняем в localStorage
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      
      if (users.find((u: User) => u.email === email)) {
        setError("Пользователь с такой почтой уже существует");
        return;
      }

      const newUser: User = {
        name,
        email,
        phone,
        isAdmin: adminEmails.includes(email.toLowerCase()),
      };
      
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      localStorage.setItem("currentUser", JSON.stringify(newUser));
      onLogin(newUser);
    } else {
      // Вход - проверяем в localStorage
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find((u: User) => u.email === email);

      if (!user) {
        setError("Пользователь не найден");
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(user));
      onLogin(user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-md bg-[#2A2A2A] border border-[#444444] rounded-[10px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white font-bold">
            {isLogin ? "Вход" : "Регистрация"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm text-[#999999]">Имя</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className="bg-[#333333] border-[#444444] text-white"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-[#999999]">Почта</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.ru"
                className="bg-[#333333] border-[#444444] text-white"
              />
            </div>
            <div>
              <label className="text-sm text-[#999999]">Телефон</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="bg-[#333333] border-[#444444] text-white"
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full btn-primary text-white"
            >
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>

            <p className="text-center text-sm text-[#999999]">
              {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-[#FF8C00] hover:underline"
              >
                {isLogin ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
