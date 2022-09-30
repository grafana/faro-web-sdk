import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { agent } from '@grafana/agent-integration-react';

import type { AuthLoginPayload } from '../../../common';
import { usePostLoginMutation } from '../../api';

export function LoginForm() {
  const navigate = useNavigate();

  const [login, loginResult] = usePostLoginMutation();

  const { handleSubmit, register: registerField } = useForm<AuthLoginPayload>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    agent.api.pushEvent('loginAttempt');

    login(data)
      .then(() => {
        agent.api.pushEvent('loginSuccessfully');

        navigate('/articles');
      })
      .catch(() => {
        agent.api.pushEvent('loginFailed');
      });
  });

  return (
    <Form onSubmit={onSubmit}>
      {loginResult.isError && !loginResult.isLoading ? (
        <Alert variant="danger">{(loginResult.error as any).data.data.message}</Alert>
      ) : null}

      <Form.Group className="mb-3" controlId="email">
        <Form.Label>Email</Form.Label>
        <Form.Control type="email" autoComplete="email" {...registerField('email')} />
        <Form.Text>We&apos;ll never share your email with anyone else.</Form.Text>
      </Form.Group>

      <Form.Group className="mb-3" controlId="password">
        <Form.Label>Password</Form.Label>
        <Form.Control type="password" autoComplete="current-password" {...registerField('password')} />
      </Form.Group>

      <Button variant="primary" type="submit">
        Login
      </Button>
    </Form>
  );
}
