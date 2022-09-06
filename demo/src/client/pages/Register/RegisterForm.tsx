import { useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import type { AuthRegisterPayload } from '../../../models';
import { usePostRegisterMutation } from '../../api';
import { useAppDispatch } from '../../hooks';
import { setUser } from '../../store';

export function RegisterForm() {
  const navigate = useNavigate();

  const [register, registerResult] = usePostRegisterMutation();

  const dispatch = useAppDispatch();

  const { handleSubmit, register: registerField } = useForm<AuthRegisterPayload>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!registerResult.isUninitialized && !registerResult.isLoading && !registerResult.isError) {
      dispatch(setUser(registerResult.data));
      navigate('/');
    }
  }, [dispatch, registerResult, navigate]);

  return (
    <Form onSubmit={handleSubmit(register)}>
      {registerResult.isError && !registerResult.isLoading ? (
        <Alert variant="danger">{(registerResult.error as any).data.message}</Alert>
      ) : null}

      <Form.Group className="mb-3" controlId="name">
        <Form.Label>Name</Form.Label>
        <Form.Control type="text" autoComplete="name" {...registerField('name')} />
      </Form.Group>

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
        Register
      </Button>
    </Form>
  );
}
