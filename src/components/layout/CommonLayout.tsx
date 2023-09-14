import { NavLink, Outlet } from 'react-router-dom';

const menus = [
  {
    name: 'editor',
    url: '/editor',
  },
//   {
//     name: 'image',
//     url: '/image',
//   },
];

const CommonLayout = () => {
  return (
    <div className='max-w-7xl m-auto my-3 p-5 border-solid border border-gray-200 rounded-2xl'>
      <nav>
        <ul className='flex space-x-2 mb-2'>
          {menus.map((menu) => (
            <li key={menu.url}>
              <NavLink
                className={({ isActive }) =>
                  `${isActive ? 'font-bold' : null}` + ''
                }
                to={menu.url}>
                {menu.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <hr className='mb-3' />

      <Outlet />
    </div>
  );
};

export default CommonLayout;
