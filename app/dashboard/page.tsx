import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = function(event) {
      console.log('Message:', event.data);
      // Traitez les données ici et mettez à jour le client
    };

    eventSource.onerror = function(error) {
      console.error('EventSource failed:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      {/* Votre contenu ici */}
    </div>
  );
}
