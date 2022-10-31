import { useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { faro } from '@grafana/faro-react';

import type { ArticleAddPayload } from '../../../common';
import { usePostArticleMutation } from '../../api';

export function ArticleAddForm() {
  const navigate = useNavigate();

  const [createArticle, createArticleResult] = usePostArticleMutation();

  const { handleSubmit, register: registerField } = useForm<ArticleAddPayload>({
    defaultValues: {
      name: '',
      text: '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    faro.api.pushEvent('createArticleAttempt', {
      name: data.name,
    });

    createArticle(data);
  });

  useEffect(() => {
    if (!createArticleResult.isUninitialized && !createArticleResult.isLoading) {
      if (createArticleResult.isError) {
        faro.api.pushEvent('createArticleFailed');
      } else {
        faro.api.pushEvent('createArticleSuccessfully');

        navigate(`/articles/view/${createArticleResult.data.data.id}`);
      }
    }
  }, [navigate, createArticleResult]);

  return (
    <Form onSubmit={onSubmit}>
      {createArticleResult.isError && !createArticleResult.isLoading ? (
        <Alert variant="danger">{(createArticleResult.error as any).data.data.message}</Alert>
      ) : null}

      <Form.Group className="mb-3" controlId="name">
        <Form.Label>Article Name</Form.Label>
        <Form.Control type="name" autoComplete="" {...registerField('name')} />
      </Form.Group>

      <Form.Group className="mb-3" controlId="text">
        <Form.Label>Text</Form.Label>
        <Form.Control type="text" autoComplete="" {...registerField('text')} />
      </Form.Group>

      <Button variant="primary" type="submit">
        Create Article
      </Button>
    </Form>
  );
}
