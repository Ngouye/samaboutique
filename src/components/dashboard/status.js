import { Clock, PackageOpen, Truck, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';

// Statuts de commande : chaque couleur est toujours accompagnée d'une icône et d'un libellé.
export const ORDER_STATUSES = [
  { id: 'PENDING', label: 'À traiter', icon: Clock, chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', step: 0 },
  { id: 'PREPARING', label: 'En préparation', icon: PackageOpen, chip: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', step: 1 },
  { id: 'IN_TRANSIT', label: 'En livraison', icon: Truck, chip: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', step: 2 },
  { id: 'DELIVERED', label: 'Livrée', icon: CircleCheck, chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', step: 3 },
  { id: 'CANCELLED', label: 'Annulée', icon: CircleX, chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', step: -1 },
  { id: 'DISPUTED', label: 'En litige', icon: TriangleAlert, chip: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', step: -1 },
];

export const statusMeta = (id) => ORDER_STATUSES.find((s) => s.id === id) || ORDER_STATUSES[0];

export const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'hier';
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
