const express = require('express');
const bodyParser = require('body-parser');
const { makeExecutableSchema } = require('graphql-tools');
const { find, filter, flatten, map, concat, orderBy } = require('lodash');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { GraphQLDate } = require('graphql-scalars');

const typeDefs = `
  scalar Date

  type Book {
    id: Int!,
    name: String,
    isbn: String,
    author: Author!,
    publish_date: Date,
    price(currency: Currency = USD): Float!,
    ratings: [Rating]
  }

  type Author {
    id: Int!,
    first_name: String!,
    last_name: String!,
    bio: String,
    books: [Book]
  }

  type Rating {
    id: Int!,
    book: Book!,
    user : User!,
    rating : Int!,
    comment : String,
    date : Date
  }

  type User {
    user_name: String!,
    first_name: String!,
    last_name: String!,
    ratings: [Rating],
    wishlist: [Book]
  }

  enum Currency {
    USD, CAD, EUR
  }

  input RatingInput {
    book_id: Int!,
    user_id: Int!,
    rating: Int!,
    comment: String
  }

  union SearchResult = Book | Author | User

  type Query {
    books: [Book],
    authors: [Author],
    users: [User],
    search(name: String): [SearchResult]
  }

  type Mutation {
    addRating(rating: RatingInput!): Rating
  }
`;



const resolvers = {
  Date: GraphQLDate,
  Query: {
    books: () => books,
    authors: () => authors,
    users: () => users,
    search: (_, { name }) => {
      if (!name) return [];
      let contains = (prop, val) => prop.toUpperCase().includes(val.toUpperCase());
      return concat(
        filter(books, (book) => contains(book.name, name)),
        filter(authors, (author) => contains(author.first_name, name) || contains(author.last_name, name)),
        filter(users, (user) => contains(user.first_name, name) || contains(user.last_name, name))
      );
    }
  },
  Mutation: {
    addRating: (_, { rating }) => {
      rating.id = orderBy(ratings, ['id'], ['desc'])[0].id + 1;
      rating.date = new Date();
      ratings.push(rating);
      return rating;
    }
  },
  Book: {
    author: (book) => find(authors, { id: book.author_id }),
    ratings: (book) => filter(ratings, { book_id: book.id }),
    price: (book, { currency }) => currency === 'USD' ? book.price : currency === 'CAD' ? book.price * 1.28 : book.price * .86
  },
  Author: {
    books: (author) => filter(books, { author_id: author.id })
  },
  Rating: {
    book: (rating) => find(books, { id: rating.book_id}),
    user: (rating) => find(users, { id: rating.user_id})
  },
  User: {
    ratings: (user) => filter(ratings, { user_id: user.id }),
    wishlist: (user) => flatten(map(filter(wishlist, { user_id: user.id }), (item) => filter(books, {id : item.book_id})))
  },
  SearchResult: {
    __resolveType(obj, context, info) {
      if (obj.user_name) {
        return 'User';
      } else if (obj.author_id) {
        return 'Book';
      }
      return 'Author';
    },
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

express()
  .use('/graphql',
    bodyParser.json(),
    graphqlExpress({ schema: schema }))
  .use('/graphiql',
    graphiqlExpress({ endpointURL: '/graphql', }))
  .listen(4000);

console.log('Running a GraphQL API server at localhost:4000/graphql');






const books = [
  { id: 1, name: 'JavaScript: The Definitive Guide', isbn: '0596805527', author_id: 1, publish_date: '2011-05-13', price: 32.64 },
  { id: 2, name: 'JavaScript: Pocket Reference', isbn: '1449316859', author_id: 1, publish_date: '2012-04-28', price: 13.47 },
  { id: 3, name: 'Javascript: The Good Parts', isbn: '0596517742', author_id: 2, publish_date: '2016-05-31', price: 20.20 },
  { id: 4, name: "You Don't Know JS: this & Object Prototypes", isbn: '1491904151', author_id: 3, publish_date: '2014-07-27', price: 20.01 },
  { id: 5, name: "You Don't Know JS: ES6 & Beyond", isbn: '1491904240', author_id: 3, publish_date: '2015-12-27', price: 20.89 },
  { id: 6, name: "You Don't Know JS: Scope & Closures", isbn: '1449335586', author_id: 3, publish_date: '2014-03-24', price: 17.00 },
  { id: 7, name: "Effective Javascript", isbn: '0321812182', author_id: 4, publish_date: '2012-12-06', price: 27.60 }
];

const authors = [
  { id: 1, first_name: 'David', last_name: 'Flanagan', bio: 'David Flanagan is a computer programmer who has spent much of the last 20 years writing books about programming languages. He now works at Mozilla. David lives with his wife and children in the Pacific Northwest, between the cities of Seattle and Vancouver.' },
  { id: 2, first_name: 'Douglas', last_name: 'Crockford', bio: "Douglas Crockford is a Senior JavaScript Architect at Yahoo!, well known for introducing and maintaining the JSON (JavaScript Object Notation) format. He's a regular speaker at conferences on advanced JavaScript topics, and serves on the ECMAScript committee." },
  { id: 3, first_name: 'Kyle', last_name: 'Simpson', bio: "Kyle Simpson is an Open Web Evangelist from Austin, TX, who's passionate about all things JavaScript. He's an author, workshop trainer, tech speaker, and OSS contributor/leader." },
  { id: 4, first_name: 'David', last_name: 'Herman' }
];

const users = [
  { id: 1, user_name: 'jsmith', first_name: 'John', last_name: 'Smith' },
  { id: 2, user_name: 'medwards', first_name: 'Mary', last_name: 'Edwards' },
  { id: 3, user_name: 'tjones', first_name: 'Terrell', last_name: 'Jones' },
  { id: 4, user_name: 'adavis', first_name: 'Alexus', last_name: 'Davis' }
];

const ratings = [
  { id: 1, book_id: 1, user_id: 1, rating: 3, date: '2017-01-12', comment: 'It was OK I guess.' },
  { id: 2, book_id: 1, user_id: 2, rating: 4, date: '2017-02-14', comment: 'Very helpful resource for me. I wish it went into more detail on closures.' },
  { id: 3, book_id: 1, user_id: 4, rating: 5, date: '2016-12-30', comment: 'Highly recommend. Read it cover to cover in a single sitting.' },
  { id: 4, book_id: 2, user_id: 3, rating: 5, date: '2015-10-30', comment: 'A good reference. I keep it my backpack always.' },
  { id: 5, book_id: 3, user_id: 1, rating: 1, date: '2015-06-18', comment: 'Did not like at all. Douglas Crockford has some very harsh opinions.' },
  { id: 6, book_id: 3, user_id: 3, rating: 5, date: '2014-09-12', comment: 'Glad that someone with the experience of Mr Crockford can share his experiences with the language.' },
  { id: 7, book_id: 3, user_id: 4, rating: 3, date: '2016-12-30', comment: 'I already knew all of this stuff. But all true.' },
  { id: 8, book_id: 4, user_id: 2, rating: 5, date: '2014-11-07', comment: 'Now I get "this". Woot!' },
  { id: 9, book_id: 5, user_id: 4, rating: 5, date: '2016-03-07', comment: 'ES6 FTW!' },
  { id: 10, book_id: 5, user_id: 1, rating: 1, date: '2016-03-07', comment: 'ES6 is over-rated. It will takes years before the browser will support it anyway. Stick with ES5.' },
  { id: 11, book_id: 6, user_id: 2, rating: 4, date: '2017-03-19', comment: 'I finally understand closures! Thanks Mr Simplson.' },
  { id: 12, book_id: 7, user_id: 3, rating: 5, date: '2016-11-19', comment: 'The most under rated Javascript book out there. You gotta read it!' },
  { id: 13, book_id: 7, user_id: 2, rating: 5, date: '2016-11-20', comment: 'Ditto what previous reviewer said. An outstanding book.' },
  { id: 14, book_id: 7, user_id: 1, rating: 1, date: '2016-11-21', comment: 'You guys are crazy - David Herman knows nothing about Javascript.' }
];

const wishlist = [
  { user_id: 1, book_id: 2 },
  { user_id: 1, book_id: 4 },
  { user_id: 2, book_id: 2 },
  { user_id: 3, book_id: 1 },
  { user_id: 3, book_id: 6 }
];
