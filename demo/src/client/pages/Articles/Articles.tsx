import { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Pagination from 'react-bootstrap/Pagination';
import { Link } from 'react-router-dom';

import { withFaroProfiler } from '@grafana/faro-react';

import { useGetArticlesQuery } from '../../api';
import { LoadingScreen, Page } from '../../components';
import { formatDate } from '../../utils';

export function ArticlesComponent() {
  const [page, setPage] = useState(0);
  const getArticlesResult = useGetArticlesQuery({ page: page.toString() });

  return (
    <Page title="Articles" view="articles">
      {getArticlesResult.isLoading ? (
        <LoadingScreen />
      ) : (
        getArticlesResult.data?.data.items.map((article) => (
          <Container key={article.id} as="article" className="pb-4 mb-4 border-bottom">
            <Link to={`/articles/view/${article.id}`}>
              <h3>{article.name}</h3>
            </Link>
            <p className="mb-3">
              {article.user.name} | {formatDate(article.date)} | {article.comments.length} comments
            </p>
            <div>{article.text}</div>
          </Container>
        ))
      )}

      <Pagination>
        <Pagination.Prev onClick={() => setPage(page - 1)} disabled={page === 0} />
        <Pagination.Item active={true}>{page + 1}</Pagination.Item>
        <Pagination.Next
          onClick={() => setPage(page + 1)}
          disabled={page >= Math.ceil((getArticlesResult.data?.data.totalSize ?? 0) / 10)}
        />
      </Pagination>
    </Page>
  );
}

export const Articles = withFaroProfiler(ArticlesComponent);
