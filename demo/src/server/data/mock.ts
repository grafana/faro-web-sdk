import { articles } from './articles';
import { comments } from './comments';
import { users } from './users';

users.push(
  {
    email: 'john.doe@grafana.com',
    id: 'f70420e0-35dc-4852-adfe-317b3ff4c81b',
    name: 'John Doe',
    password: '$2a$10$Y57LY5iZCOSBV7Jsq16treod.nMuYSJe0qgw3SPo3v2cGHYWTD5D6',
  },
  {
    email: 'jane.doe@grafana.com',
    id: '64c69994-1181-43be-a37f-4587153e9dc6',
    name: 'Jane Wing',
    password: '$2a$10$Y57LY5iZCOSBV7Jsq16treod.nMuYSJe0qgw3SPo3v2cGHYWTD5D6',
  },
  {
    email: 'mark.mayer@grafana.com',
    id: '6c030198-5e6e-4eb4-8e7d-a135023105fa',
    name: 'Mark Mayer',
    password: '$2a$10$Y57LY5iZCOSBV7Jsq16treod.nMuYSJe0qgw3SPo3v2cGHYWTD5D6',
  }
);

articles.push(
  {
    date: Date.now(),
    id: '13947569-1c0b-4915-8ed9-08e132030f35',
    name: 'First article',
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent quis porta lacus, at volutpat quam. Nulla faucibus arcu volutpat, consectetur diam eget, tempor nunc. Vestibulum ac dignissim nunc. Sed bibendum justo a risus vulputate, nec rutrum neque blandit. Praesent pharetra mattis urna, at placerat nisl venenatis ut. Morbi at nibh in orci convallis egestas. Etiam eu consequat neque, in sagittis magna. Vivamus rhoncus euismod magna, quis sagittis dui luctus quis. Duis eleifend, tellus quis bibendum bibendum, ipsum neque hendrerit odio, quis suscipit nisl massa ut nisi.

Fusce mattis sodales nulla, vitae condimentum risus. Maecenas blandit magna id sapien viverra, consectetur laoreet magna scelerisque. Maecenas molestie tortor sit amet ex faucibus, et molestie nisl auctor. Fusce varius, enim eu tincidunt accumsan, magna libero accumsan neque, ac rhoncus erat elit quis nibh. Sed tincidunt ut elit sit amet interdum. Fusce quis nunc convallis ante laoreet tristique. Praesent magna turpis, placerat vitae volutpat quis, commodo vel nisi. Pellentesque facilisis mauris ac mi scelerisque ultricies. Integer sodales, quam in convallis egestas, nulla erat pretium diam, eget consectetur neque nisl sit amet orci. Nulla scelerisque ultricies pulvinar. Integer odio est, commodo eget ex ut, laoreet vestibulum orci. Nam sagittis, lacus eu lobortis dapibus, odio sem dignissim mi, vel scelerisque quam elit vitae urna. Nullam posuere elit sem, ac pharetra risus commodo quis.

Praesent id placerat libero. Fusce venenatis, dolor ut luctus fringilla, neque metus interdum nisl, ut aliquet mi justo sit amet eros. Nulla facilisi. Suspendisse potenti. Maecenas aliquet massa id metus fringilla, eget luctus orci porta. Etiam consequat lacus ac dignissim vehicula. Nam laoreet ligula nec ex lobortis fermentum.

Proin feugiat nulla eget lorem malesuada, quis porta tortor semper. Sed consequat suscipit ante at elementum. Fusce finibus tellus in odio aliquet facilisis. Donec ut mi sapien. Donec gravida dictum malesuada. In at eros vel justo lobortis hendrerit. Duis dictum, lacus id auctor tincidunt, turpis arcu lobortis felis, eget consequat velit massa sed neque. Suspendisse ac ipsum felis. Phasellus ac est odio. Morbi eu imperdiet tortor. Fusce a velit justo. Suspendisse feugiat volutpat pretium. Donec non massa erat. Curabitur laoreet varius nulla, non auctor nulla ullamcorper eu. Vivamus posuere porta eros ut cursus.

Sed viverra malesuada erat. Nulla a arcu sed neque eleifend tempor. Donec viverra diam sed ante pulvinar, sit amet condimentum tortor sodales. Donec lacinia convallis ex id blandit. Proin fermentum sed mi at sagittis. Phasellus ultrices cursus nunc, vitae varius elit mollis ut. Curabitur ut sodales sapien, vitae dignissim massa. Aliquam pellentesque tincidunt semper. Suspendisse a ligula non ligula aliquet luctus et ac augue. Cras at dictum quam. Curabitur semper nunc in augue bibendum dictum. Fusce dapibus efficitur mattis. Ut vitae nibh mi. Maecenas vitae ornare lectus. Quisque consequat fermentum metus vitae varius. In cursus pharetra molestie.`,
    userId: '64c69994-1181-43be-a37f-4587153e9dc6',
  },
  {
    date: Date.now(),
    id: 'ea32c1bd-bdbe-4161-be30-41d00075f1f3',
    name: 'Second article',
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tincidunt fermentum viverra. Aliquam sit amet finibus elit. Phasellus euismod a nisl ut consectetur. Morbi aliquet ante quis sollicitudin lobortis. Vivamus ut pharetra mauris. Morbi luctus ex at risus lacinia, et rhoncus ligula commodo. Duis vel erat in massa dictum tempus non elementum augue. Pellentesque euismod lacus vitae volutpat semper. Ut in dolor id tellus faucibus dignissim ac sed massa.

Phasellus feugiat semper odio, sed venenatis quam imperdiet nec. Nam porta efficitur elit, sed tincidunt massa vestibulum sit amet. Nulla nec fringilla nisi, et porta orci. Donec scelerisque quam massa, non commodo arcu fermentum quis. Aliquam vitae nisi sapien. Pellentesque pretium mi id massa porttitor malesuada. Phasellus aliquet ex elementum, viverra risus sit amet, cursus massa. Donec nulla elit, maximus vitae posuere ac, commodo ac leo.`,
    userId: '6c030198-5e6e-4eb4-8e7d-a135023105fa',
  }
);

comments.push(
  {
    articleId: '13947569-1c0b-4915-8ed9-08e132030f35',
    date: Date.now(),
    id: '6967a98a-5a97-4de5-87ca-a231caa0f878',
    text: 'This is a comment',
    userId: '64c69994-1181-43be-a37f-4587153e9dc6',
  },
  {
    articleId: '13947569-1c0b-4915-8ed9-08e132030f35',
    date: Date.now(),
    id: 'db7c04bc-c70a-4bed-9aa5-cfbc4d544c84',
    text: 'This is another comment',
    userId: '6c030198-5e6e-4eb4-8e7d-a135023105fa',
  }
);
