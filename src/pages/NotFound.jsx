// Page affichée pour une adresse inconnue (au lieu d'une page blanche).
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, House, MapPinned } from 'lucide-react';
import StatusScreen from '../components/StatusScreen';

export default function NotFound() {
  const { pathname } = useLocation();
  useEffect(() => { document.title = 'Page introuvable · SamaBoutik'; }, []);
  const shown = pathname.length > 48 ? `${pathname.slice(0, 47)}…` : pathname;

  return (
    <StatusScreen
      icon={Compass}
      code="404"
      kicker="Erreur 404"
      title="Cette page s’est perdue en chemin."
      actions={[
        { to: '/', label: 'Retour à l’accueil', icon: House, primary: true },
        { to: '/boutiques', label: 'Boutiques près de chez moi', icon: MapPinned },
      ]}
      footer={<>Vous êtes commerçant ? <Link to="/login">Se connecter</Link> · <Link to="/register">Créer ma boutique</Link></>}
    >
      L’adresse <span className="break-all font-mono text-sm text-white/85">{shown}</span> n’existe pas.
      Elle est peut-être mal écrite, ou la page a été déplacée.
    </StatusScreen>
  );
}
