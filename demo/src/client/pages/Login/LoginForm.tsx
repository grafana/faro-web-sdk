import { useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import type { AuthLoginPayload } from '../../../models';
import { usePostLoginMutation } from '../../api';
import { useAppDispatch } from '../../hooks';
import { setUser } from '../../store';

export function LoginForm() {
  const navigate = useNavigate();

  const [login, loginResult] = usePostLoginMutation();

  const dispatch = useAppDispatch();

  const { handleSubmit, register: registerField } = useForm<AuthLoginPayload>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!loginResult.isUninitialized && !loginResult.isLoading && !loginResult.isError) {
      dispatch(setUser(loginResult.data));

      navigate('/');
    }
  }, [dispatch, loginResult, navigate]);

  return (
    <Form onSubmit={handleSubmit(login)}>
      {loginResult.isError && !loginResult.isLoading ? (
        <Alert variant="danger">{(loginResult.error as any).data.message}</Alert>
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
