import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold">{t('welcome_message')}</h1>
    </div>
  );
}

export default App;
