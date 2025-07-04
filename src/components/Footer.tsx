export default function Footer() {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto py-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CrediFacil. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
