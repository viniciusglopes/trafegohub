"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Check, Crown, Zap, Building2, Sparkles } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Sparkles,
    color: "text-gray-400",
    borderColor: "border-gray-700",
    features: [
      "1 conta de anuncio",
      "Somente Meta Ads",
      "Visualizar campanhas",
      "Sync a cada 6 horas",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 49,
    icon: Zap,
    color: "text-blue-400",
    borderColor: "border-blue-600",
    popular: true,
    features: [
      "3 contas de anuncio",
      "2 plataformas",
      "Pausar/ativar campanhas",
      "Editar orcamento",
      "Sync a cada 1 hora",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    icon: Crown,
    color: "text-purple-400",
    borderColor: "border-purple-600",
    features: [
      "10 contas de anuncio",
      "Todas as plataformas",
      "Alertas automaticos",
      "Relatorios PDF",
      "Sync a cada 15 minutos",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: 249,
    icon: Building2,
    color: "text-amber-400",
    borderColor: "border-amber-600",
    features: [
      "Contas ilimitadas",
      "Todas as plataformas",
      "Multi-usuario",
      "White label",
      "API de acesso",
      "Suporte prioritario",
    ],
  },
];

export default function PlansPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlan = session?.user?.plan || "free";

  async function handleUpgrade(planId: string) {
    if (planId === "free" || planId === currentPlan) return;

    setLoading(planId);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-100">Planos</h1>
        <p className="text-gray-400 mt-2">
          Escolha o plano ideal para o seu negocio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-gray-900 border-2 rounded-xl p-6 flex flex-col ${
                plan.popular ? plan.borderColor : "border-gray-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                  Popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${plan.color}`} />
                <h2 className="text-lg font-semibold text-gray-100">
                  {plan.name}
                </h2>
              </div>

              <div className="mb-6">
                {plan.price === 0 ? (
                  <p className="text-3xl font-bold text-gray-100">Gratis</p>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-gray-400">R$</span>
                    <span className="text-3xl font-bold text-gray-100">
                      {plan.price}
                    </span>
                    <span className="text-sm text-gray-400">/mes</span>
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-gray-800 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                >
                  Plano atual
                </button>
              ) : plan.id === "free" ? (
                <button
                  disabled
                  className="w-full py-2.5 bg-gray-800 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                >
                  Plano gratuito
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-2.5 font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-100"
                  }`}
                >
                  {loading === plan.id ? "Redirecionando..." : "Assinar"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
