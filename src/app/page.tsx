import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import {
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Check,
  Layers,
  TrendingUp,
  Bell,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "",
    features: [
      "1 conta de anuncio",
      "Meta Ads apenas",
      "Visualizar campanhas",
      "Sincronizacao a cada 6h",
    ],
    cta: "Comecar",
    popular: false,
  },
  {
    name: "Starter",
    price: "R$ 49",
    period: "/mes",
    features: [
      "3 contas de anuncio",
      "2 plataformas",
      "Pausar/ativar campanhas",
      "Ajuste de budget",
      "Sincronizacao a cada 1h",
    ],
    cta: "Comecar",
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 99",
    period: "/mes",
    features: [
      "10 contas de anuncio",
      "Todas as plataformas",
      "Alertas automaticos",
      "Relatorios avancados",
      "Regras automaticas",
      "Sincronizacao a cada 15min",
    ],
    cta: "Comecar",
    popular: true,
  },
  {
    name: "Agency",
    price: "R$ 249",
    period: "/mes",
    features: [
      "Contas ilimitadas",
      "Multi-usuario",
      "White label",
      "API de integracao",
      "Suporte prioritario",
      "Sincronizacao em tempo real",
    ],
    cta: "Comecar",
    popular: false,
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-blue-500" />
              <span className="text-xl font-bold text-gray-100">
                TrafegoHub
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="#planos"
                className="text-sm text-gray-400 hover:text-gray-100 transition-colors hidden sm:block"
              >
                Planos
              </Link>
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-100 tracking-tight leading-tight">
              Gerencie todo seu trafego pago em um{" "}
              <span className="text-blue-500">so lugar</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Meta Ads, Google Ads e TikTok Ads em um dashboard unificado.
              Controle campanhas, orcamentos e metricas em tempo real.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-base"
              >
                Comecar Gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#planos"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-gray-100 font-medium rounded-xl transition-colors text-base"
              >
                Ver Planos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-100">
              Tudo que voce precisa para escalar
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Centralize a gestao de trafego pago e tome decisoes mais rapidas
              com dados unificados.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-5">
                <Layers className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">
                Multiplas Plataformas
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Meta Ads, Google Ads e TikTok Ads unificados em um unico
                dashboard. Veja todas as suas campanhas de uma vez.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">
                Controle Total
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Pause, ative e ajuste budgets de campanhas sem sair do
                dashboard. Acoes rapidas com um clique.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">
                Relatorios Inteligentes
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Metricas consolidadas de todas as plataformas com alertas
                automaticos quando algo precisa de atencao.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="py-20 sm:py-28 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-100">
              Planos para cada momento
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Comece gratis e escale conforme sua operacao cresce.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-gray-900 border rounded-2xl p-6 flex flex-col ${
                  plan.popular
                    ? "border-blue-500 ring-1 ring-blue-500/20"
                    : "border-gray-800"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-100">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500 text-sm">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-400"
                    >
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600/10 via-blue-600/5 to-transparent border border-gray-800 rounded-2xl p-8 sm:p-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-blue-500" />
              <Bell className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4">
              Pronto para otimizar seu trafego?
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
              Crie sua conta gratuitamente e conecte suas plataformas de
              anuncio em minutos.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Comecar Gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-bold text-gray-100">
                TrafegoHub
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/termos"
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Termos
              </Link>
              <Link
                href="/privacidade"
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Privacidade
              </Link>
              <Link
                href="/contato"
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Contato
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              &copy; 2026 TrafegoHub. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
