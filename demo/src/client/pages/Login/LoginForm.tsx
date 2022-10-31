import { useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { faro } from '@grafana/faro-react';

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
    faro.api.pushEvent('loginAttempt');

    login(data);
  });

  useEffect(() => {
    if (!loginResult.isUninitialized && !loginResult.isLoading) {
      if (loginResult.isError) {
        faro.api.pushEvent('loginFailed');
      } else {
        faro.api.pushEvent('loginSuccessfully');

        navigate('/articles');
      }
    }
  }, [loginResult, navigate]);

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
