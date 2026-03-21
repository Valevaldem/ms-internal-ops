"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return loginAction(formData);
  }, { error: "" });

  return (
    <div className="min-h-screen bg-[#F5F2EE] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-3xl tracking-widest text-center text-[#333333] uppercase font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
          Maria Salinas
        </h1>
        <h2 className="mt-4 text-center text-sm tracking-wider text-[#8E8D8A] uppercase">
          Acceso Interno
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-[#D8D3CC]">
          <form action={formAction} className="space-y-6">
            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#333333]">
                Usuario
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#8E8D8A]" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="focus:ring-[#C5B358] focus:border-[#C5B358] block w-full pl-10 sm:text-sm border-[#D8D3CC] rounded-md py-2 px-3 border"
                  placeholder="Tu nombre de usuario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#333333]">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#8E8D8A]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="focus:ring-[#C5B358] focus:border-[#C5B358] block w-full pl-10 sm:text-sm border-[#D8D3CC] rounded-md py-2 px-3 border"
                  placeholder="Tu contraseña"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#333333] hover:bg-[#222222] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C5B358] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isPending ? "Ingresando..." : "Ingresar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
