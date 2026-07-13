export function FlowHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <header>
      <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
    </header>
  )
}
