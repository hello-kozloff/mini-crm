import { AppShell, Badge, Button, Container, Group, Text } from '@mantine/core'
import { Navigate, NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { ROLE_LABEL } from '../lib/status'
import { ErrorAlert, PageLoader } from './common'

export function RequireAuth() {
  const { session, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <Container py="xl">
        <ErrorAlert error={{ message: 'Профиль пользователя не найден. Обратитесь к администратору.' }} />
      </Container>
    )
  }
  return <Layout />
}

function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Text fw={700} mr="md" visibleFrom="xs">
                Мини-CRM
              </Text>
              <Button component={NavLink} to="/" variant="subtle" size="compact-sm">
                Объекты
              </Button>
              {profile?.role === 'executor' && (
                <Button component={NavLink} to="/my" variant="subtle" size="compact-sm">
                  Мои задачи
                </Button>
              )}
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" visibleFrom="sm">
                {profile?.full_name}
              </Text>
              {profile && <Badge variant="outline">{ROLE_LABEL[profile.role]}</Badge>}
              <Button variant="default" size="compact-sm" onClick={signOut}>
                Выйти
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
